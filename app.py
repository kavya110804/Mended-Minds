from flask import Flask, request, jsonify, render_template
import mysql.connector
import bcrypt
import jwt
import datetime
from functools import wraps
import json

app = Flask(__name__)

SECRET_KEY = "mended-minds-secret-2024"


# DB CONNECTION

def get_db_connection():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="1108",  # your MySQL password
        database="mended_minds",
        charset="utf8mb4"
    )

MOOD_EMOJI_MAP = {
    "Very Happy" : "😄",
    "Happy" : "☺️",
    "Neutral" : "😐",
    "Sad" : "😔",
    "Very Sad" : "😭",
}

# JWT DECORATOR

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"message": "Token is missing!"}), 401

        try:
            if token.startswith("Bearer "):
                token = token.split(" ")[1]

            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user_email = data["email"]

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token!"}), 401

        return f(current_user_email, *args, **kwargs)

    return decorated


# PAGE ROUTES

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/signup")
def signup_page():
    return render_template("signup.html")


@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


@app.route("/mood")
def mood_page():
    return render_template("mood.html")


# API: SIGNUP

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not name or not email or not username or not password:
        return jsonify({"message": "All fields are required!"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters!"}), 400

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO users (name, email, username, password) VALUES (%s, %s, %s, %s)",
            (name, email, username, hashed_pw)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Account created successfully!"}), 201

    except mysql.connector.IntegrityError as e:
        if "email" in str(e):
            return jsonify({"message": "Email already registered!"}), 409
        if "username" in str(e):
            return jsonify({"message": "Username already taken!"}), 409
        return jsonify({"message": "Registration failed!"}), 400

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# API: LOGIN

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"message": "Email and password required!"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({"message": "Invalid credentials!"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
            return jsonify({"message": "Invalid credentials!"}), 401

        token = jwt.encode({
            "email": user["email"],
            "user_id": user["id"],
            "name": user["name"],
            "role": user["role"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({
            "message": "Login successful!",
            "token": token,
            "name": user["name"],
            "role": user["role"]
        })

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# API: PROFILE

@app.route("/api/profile", methods=["GET"])
@token_required
def profile(current_user_email):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, name, email, username, role, created_at FROM users WHERE email = %s",
            (current_user_email,)
        )

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({"message": "User not found!"}), 404

        return jsonify(user)

    except Exception as e:
        return jsonify({"message": str(e)}), 500


@app.route("/api/moods", methods=["GET"])
def get_moods():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM moods ORDER BY mood_score DESC")
        moods = cursor.fetchall()

        cursor.close()
        conn.close()
        
        for mood in moods:
            mood["emoji"] = MOOD_EMOJI_MAP.get(mood["mood_name"],"☺️")

        return jsonify(moods)

    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/api/my-moods", methods=["GET"])
@token_required
def get_my_moods(current_user_email):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM users WHERE email = %s", (current_user_email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404

        cursor.execute(
            """
            SELECT ml.logged_date, ml.note, ml.mood_score, m.mood_name
            FROM mood_logs ml
            JOIN moods m ON ml.mood_id = m.id
            WHERE ml.user_id = %s
              AND YEAR(ml.logged_date) = YEAR(CURDATE())
              AND MONTH(ml.logged_date) = MONTH(CURDATE())
            ORDER BY ml.logged_date DESC
            """,
            (user["id"],)
        )

        moods = cursor.fetchall()

        cursor.close()
        conn.close()

        for mood in moods:
            mood["emoji"] = MOOD_EMOJI_MAP.get(mood["mood_name"], "🙂")

        return jsonify(moods)

    except Exception as e:
        return jsonify({"message": str(e)}), 500


@app.route("/api/log-mood", methods=["POST"])
@token_required
def log_mood(current_user_email):
    data = request.get_json()
    mood_id = data.get("mood_id")
    note = data.get("note", "")

    if not mood_id:
        return jsonify({"message": "Please select a mood"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get user
        cursor.execute("SELECT id FROM users WHERE email = %s", (current_user_email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404

        # Get mood score
        cursor.execute("SELECT mood_score FROM moods WHERE id = %s", (mood_id,))
        mood = cursor.fetchone()

        if not mood:
            return jsonify({"message": "Invalid mood"}), 400
        
        today = datetime.date.today()

        # Check if already logged today (using logged_date column)
        cursor.execute(
            "SELECT id FROM mood_logs WHERE user_id = %s AND logged_date = %s", 
            (user["id"], today)
        )

        existing = cursor.fetchone()

        if existing:
            # Update existing entry
            cursor.execute(
                """
                UPDATE mood_logs
                SET mood_id = %s, mood_score = %s, note = %s
                WHERE user_id = %s AND logged_date = %s
                """,
                (mood_id, mood["mood_score"], note, user["id"], today)
            )
            message = "Mood updated successfully 💙"
        else:
            # Insert new entry
            cursor.execute(
                """
                INSERT INTO mood_logs (user_id, mood_id, mood_score, note, logged_date, logged_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (user["id"], mood_id, mood["mood_score"], note, today)
            )
            message = "Mood saved successfully 💙"
        
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": message})

    except Exception as e:
        print("LOG MOOD ERROR:", str(e))
        return jsonify({"message": str(e)}), 500

#booking
@app.route("/booking")
def booking_page():
    return render_template("booking.html")

@app.route("/api/book-session", methods=["POST"])
@token_required
def book_session(current_user_email):
    data = request.get_json()

    counsellor_id = data.get("counsellor_id")
    issue = data.get("issue")
    slot_datetime = data.get("slot_datetime")
    notes = data.get("notes", "")

    if not issue:
        return jsonify({"message": "Please select an issue"}), 400

    if not slot_datetime:
        return jsonify({"message": "Please select date and time"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # get user id
        cursor.execute("SELECT id FROM users WHERE email = %s", (current_user_email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404
        
        cursor.execute(
            "INSERT INTO bookings (user_id, counsellor_id, issue, slot_datetime, notes) VALUES (%s, %s, %s, %s, %s)",
            (user["id"], counsellor_id, issue, slot_datetime, notes)
            )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Session booked successfully!"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500

#backend api to get bookings
@app.route("/api/my-bookings", methods=["GET"])
@token_required
def get_my_bookings(current_user_email):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # get user id
        cursor.execute("SELECT id FROM users WHERE email = %s", (current_user_email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404

        cursor.execute("""
            SELECT * FROM bookings 
            WHERE user_id = %s 
            ORDER BY slot_datetime DESC
        """, (user["id"],))

        bookings = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(bookings)

    except Exception as e:
        return jsonify({"message": str(e)}), 500

#community support
@app.route("/support")
def support_page():
    return render_template("support.html")

@app.route("/announcements", methods=["GET"])
def get_announcements():
    with open("announcements.json") as f:
        data = json.load(f)
    return jsonify(data)

#sound therapy - ADD THIS
@app.route("/sound-therapy")
def sound_therapy_page():
    return render_template("sound-therapy.html")

# DASHBOARD API
@app.route("/api/dashboard/stats", methods=["GET"])
@token_required
def get_dashboard_stats(current_user_email):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM users WHERE email = %s", (current_user_email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "User not found"}), 404

        user_id = user["id"]
        today = datetime.date.today()

        # 1. Today's mood (JOIN with moods table)
        cursor.execute("""
            SELECT m.mood_name
            FROM mood_logs ml
            JOIN moods m ON ml.mood_id = m.id
            WHERE ml.user_id = %s AND DATE(ml.logged_at) = %s
            ORDER BY ml.logged_at DESC LIMIT 1
        """, (user_id, today))
        today_mood = cursor.fetchone()

        # 2. Weekly average (last 7 days)
        week_ago = today - datetime.timedelta(days=7)
        cursor.execute("""
            SELECT AVG(ml.mood_score) as avg_score
            FROM mood_logs ml
            WHERE ml.user_id = %s AND DATE(ml.logged_at) >= %s
        """, (user_id, week_ago))
        weekly_stats = cursor.fetchone()

        # 3. Sessions booked
        cursor.execute("""
            SELECT COUNT(*) as session_count
            FROM bookings
            WHERE user_id = %s
        """, (user_id,))
        bookings = cursor.fetchone()

        cursor.close()
        conn.close()

        return jsonify({
            "today_mood": today_mood["mood_name"] if today_mood else "Not logged",
            "weekly_avg": round(weekly_stats["avg_score"], 1) if weekly_stats["avg_score"] else None,
            "session_count": bookings["session_count"]
        })

    except Exception as e:
        print("DASHBOARD ERROR:", str(e))
        return jsonify({"message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
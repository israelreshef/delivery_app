# utils/auth.py
def register_routes(app):
    @app.route('/login')
    def login():
        return {"message": "דף התחברות – יבוא בהמשך :)"}

    @app.route('/register')
    def register():
        return {"message": "דף הרשמה – יבוא בהמשך :)"}
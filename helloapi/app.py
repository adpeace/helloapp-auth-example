from flask import Flask, request, jsonify
from flask_restx import Api, Resource, fields
from flask_login import LoginManager, UserMixin, login_user, \
    login_required, logout_user
from flask_login import current_user
from http import HTTPStatus

from . import google_token

app = Flask(__name__)
try:
    app.config.from_envvar("HELLO_CONFIG")
    app.config['REMEMBER_COOKIE_HTTPONLY'] = True
except RuntimeError:
    pass
login = LoginManager()
login.init_app(app)
login.session_protection = 'strong'

api = Api(app=app, title="The Hello App",
          description="Simple app to demonstrate login/logout with Google")

app.secret_key = app.config['SECRET_KEY']


class User(UserMixin):
    """Simple User class that stores ID, name, and profile image."""
    def __init__(self, ident, name, profile_pic):
        self.id = ident
        self.name = name
        self.profile_pic = profile_pic

    def update(self, name, profile_pic):
        self.name = name
        self.profile_pic = profile_pic


# A simple user manager.  A real world application would implement the same
# interface but using a database as a backing store.  Note that this
# implementation will behave unexpectedly if the user contacts multiple
# instances of the application since it is using an in-memory store.
class UserManager(object):
    """Simple user manager class.

    Replace with something that talks to your database instead.
    """

    def __init__(self):
        self.known_users = {}

    def add_or_update_google_user(self, google_subscriber_id, name,
                                  profile_pic):
        """Add or update user profile info."""
        if google_subscriber_id in self.known_users:
            self.known_users[google_subscriber_id].update(name, profile_pic)
        else:
            self.known_users[google_subscriber_id] = \
                User(google_subscriber_id, name, profile_pic)
        return self.known_users[google_subscriber_id]

    def lookup_user(self, google_subscriber_id):
        """Lookup user by ID.  Returns User object."""
        return self.known_users.get(google_subscriber_id)


user_manager = UserManager()

# The user loader looks up a user by their user ID, and is called by
# flask-login to get the current user from the session.  Return None
# if the user ID isn't valid.
@login.user_loader
def user_loader(user_id):
    return user_manager.lookup_user(user_id)


# Decorator to add CSRF protection to any mutating function.
#
# Adding this header to the client forces the browser to first do an OPTIONS
# call, determine that the origin is not allowed, and block the subsequent
# call. (Ordinarily, the call is made but the result not made available to
# the client if the origin is not allowed, but the damage is already done.)
# Checking for the presence of this header on the server side prevents
# clients from bypassing this check.
#
# Add this decorator to all mutating operations.
def csrf_protection(fn):
    """Require that the X-Requested-With header is present."""
    def protected(*args):
        if 'X-Requested-With' in request.headers:
            return fn(*args)
        else:
            return "X-Requested-With header missing", HTTPStatus.FORBIDDEN
    return protected


@api.route("/me")
class Me(Resource):
    """The currently logged-in user.

    GET will return information about the user if a session exists.
    POST will login a user given an ID token, and set a session cookie.
    DELETE will log out the currently logged-in user.
    """

    a_user = api.model("User", {
        'google_id': fields.Integer(
            description="The user's Google account ID"),
        'name': fields.String(description="The user's full name"),
        'picture': fields.Url(description="A URL to the profile image"),
    })

    @login_required
    @api.response(HTTPStatus.OK, 'Success', a_user)
    def get(self):
        return jsonify({
            'google_id': current_user.id,
            'name': current_user.name,
            'picture': current_user.profile_pic
        })

    @api.param(
        'id_token', 'A JWT from the Google Sign-In SDK to be validated',
        _in='formData')
    @api.response(HTTPStatus.OK, 'Success', a_user)
    @api.response(HTTPStatus.FORBIDDEN, "Unauthorized")
    @csrf_protection
    def post(self):
        # Validate the identity
        id_token = request.form.get('id_token')
        if id_token is None:
            return "No ID token provided", HTTPStatus.FORBIDDEN

        try:
            identity = google_token.validate_id_token(
                id_token, app.config['GOOGLE_CLIENT_ID'])
        except ValueError:
            return 'Invalid ID token', HTTPStatus.FORBIDDEN

        # Get the user info out of the validated identity
        if ('sub' not in identity or
                'name' not in identity or
                'picture' not in identity):
            return "Unexcpected authorization response", HTTPStatus.FORBIDDEN

        # This just adds a new user that hasn't been seen before and assumes it
        # will work, but you could extend the logic to do something different
        # (such as only allow known users, or somehow mark a user as new so
        # your frontend can collect extra profile information).
        user = user_manager.add_or_update_google_user(
                identity['sub'], identity['name'], identity['picture'])

        # Authorize the user:
        login_user(user, remember=True)

        return self.get()

    @login_required
    @api.response(HTTPStatus.NO_CONTENT, "Success")
    @csrf_protection
    def delete(self):
        logout_user()
        return "", HTTPStatus.NO_CONTENT

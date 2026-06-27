from marshmallow import Schema, fields, validate, validates, ValidationError
import re


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterSchema(Schema):
    full_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    username = fields.String(required=True, validate=validate.Length(min=2, max=30))
    email = fields.String(required=True, validate=validate.Length(max=200))
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    dob = fields.String(allow_none=True)
    role = fields.String(allow_none=True)

    @validates("email")
    def validate_email(self, value):
        if not EMAIL_REGEX.match(value):
            raise ValidationError("Invalid email format")

    @validates("username")
    def validate_username(self, value):
        if not re.match(r"^[a-zA-Z0-9_]+$", value):
            raise ValidationError("Username can only contain letters, numbers, and underscores")


class LoginSchema(Schema):
    email = fields.String(required=True)
    password = fields.String(required=True)


class UpdateProfileSchema(Schema):
    full_name = fields.String(validate=validate.Length(min=1, max=100))
    username = fields.String(validate=validate.Length(min=2, max=30))
    bio = fields.String(validate=validate.Length(max=500))
    profile_photo_url = fields.String()
    profile_photo_public_id = fields.String()


class ChangePasswordSchema(Schema):
    current_password = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=8, max=128))

from marshmallow import Schema, fields, validate


class UpdateMemberRoleSchema(Schema):
    role = fields.String(required=True, validate=validate.OneOf(["admin", "editor", "member", "viewer"]))


class InviteMemberSchema(Schema):
    email = fields.Email(required=True)

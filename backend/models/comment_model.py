from marshmallow import Schema, fields, validate


class CreateCommentSchema(Schema):
    target_type = fields.String(required=True, validate=validate.OneOf(["expense", "memory", "itinerary_item"]))
    target_id = fields.String(required=True)
    text = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    parent_comment_id = fields.String(missing=None)

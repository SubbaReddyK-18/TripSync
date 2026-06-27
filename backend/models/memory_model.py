from marshmallow import Schema, fields, validate


class CreateMemorySchema(Schema):
    cloudinary_url = fields.String(required=True)
    cloudinary_public_id = fields.String(required=True)
    file_type = fields.String(required=True, validate=validate.OneOf(["image", "video"]))
    caption = fields.String(validate=validate.Length(max=500))
    tags = fields.List(fields.String(validate=validate.Length(max=50)), missing=[])


class UpdateMemorySchema(Schema):
    caption = fields.String(validate=validate.Length(max=500))
    tags = fields.List(fields.String(validate=validate.Length(max=50)))

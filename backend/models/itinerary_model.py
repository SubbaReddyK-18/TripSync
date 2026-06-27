from marshmallow import Schema, fields, validate


class CreateItineraryItemSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=1000))
    date = fields.Date(required=True, format="%Y-%m-%d")
    start_time = fields.String(validate=validate.Length(max=10))
    end_time = fields.String(validate=validate.Length(max=10))
    location = fields.String(validate=validate.Length(max=300))
    type = fields.String(
        validate=validate.OneOf(["transport", "accommodation", "activity", "meal", "other"]),
        missing="other",
    )
    notes = fields.String(validate=validate.Length(max=2000))
    booking_reference = fields.String(validate=validate.Length(max=100))


class UpdateItineraryItemSchema(Schema):
    title = fields.String(validate=validate.Length(min=1, max=200))
    description = fields.String(validate=validate.Length(max=1000))
    date = fields.Date(format="%Y-%m-%d")
    start_time = fields.String(validate=validate.Length(max=10))
    end_time = fields.String(validate=validate.Length(max=10))
    location = fields.String(validate=validate.Length(max=300))
    type = fields.String(validate=validate.OneOf(["transport", "accommodation", "activity", "meal", "other"]))
    notes = fields.String(validate=validate.Length(max=2000))
    booking_reference = fields.String(validate=validate.Length(max=100))

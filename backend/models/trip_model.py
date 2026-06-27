from marshmallow import Schema, fields, validate


class CreateTripSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000))
    destination = fields.String(required=True, validate=validate.Length(max=200))
    start_date = fields.Date(required=True, format="%Y-%m-%d")
    end_date = fields.Date(required=True, format="%Y-%m-%d")
    currency = fields.String(validate=validate.Length(equal=3), missing="INR")


class UpdateTripSchema(Schema):
    title = fields.String(validate=validate.Length(min=2, max=100))
    description = fields.String(validate=validate.Length(max=1000))
    destination = fields.String(validate=validate.Length(max=200))
    start_date = fields.Date(format="%Y-%m-%d")
    end_date = fields.Date(format="%Y-%m-%d")
    currency = fields.String(validate=validate.Length(equal=3))
    status = fields.String(validate=validate.OneOf(["planning", "ongoing", "completed", "cancelled"]))

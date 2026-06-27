from marshmallow import Schema, fields, validate


class CreateLocationSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    latitude = fields.Float(required=True, validate=validate.Range(min=-90, max=90))
    longitude = fields.Float(required=True, validate=validate.Range(min=-180, max=180))
    visit_date = fields.String(required=True)
    description = fields.String(validate=validate.Length(max=1000))
    category = fields.String(validate=validate.OneOf([
        "attraction", "restaurant", "hotel", "transport", "nature",
        "museum", "shopping", "nightlife", "other"
    ]))
    google_place_id = fields.String()


class UpdateLocationSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=200))
    latitude = fields.Float(validate=validate.Range(min=-90, max=90))
    longitude = fields.Float(validate=validate.Range(min=-180, max=180))
    visit_date = fields.String()
    description = fields.String(validate=validate.Length(max=1000))
    category = fields.String(validate=validate.OneOf([
        "attraction", "restaurant", "hotel", "transport", "nature",
        "museum", "shopping", "nightlife", "other"
    ]))
    google_place_id = fields.String()

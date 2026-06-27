import cloudinary
from config.settings import BaseConfig


def init_cloudinary():
    cloudinary.config(
        cloud_name=BaseConfig.CLOUDINARY_CLOUD_NAME,
        api_key=BaseConfig.CLOUDINARY_API_KEY,
        api_secret=BaseConfig.CLOUDINARY_API_SECRET,
        secure=True,
    )

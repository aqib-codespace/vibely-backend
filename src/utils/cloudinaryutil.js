import cloudinary from "../config/cloudinary.js";

export const uploadImage = async (file, options = {}) => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    let uploadOptions = {
      folder: options.folder || "pictures",
      use_filename: true,
      ...options,
    };
    let result;
    try {
      if (file.buffer) {
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, res) => {
              if (error) {
                console.error("Cloudinary upload_stream error:", error);
                reject(error);
              } else {
                resolve(res);
              }
            }
          );
          uploadStream.end(file.buffer);
        });
      } else {
        result = await cloudinary.uploader.upload(file, uploadOptions);
      }
    } catch (err) {
      console.error("Error during Cloudinary upload:", err);
      throw err;
    }
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Image upload failed");
  }
};

export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Image delete failed");
  }
};

export const uploadVideo = async (file, folder = "videos") => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    let result;

    // Handle both buffer (memory storage) and path (disk storage) cases
    if (file.buffer) {
      // For memory storage
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder,
            use_filename: true,
          },
          (error, res) => {
            if (error) {
              console.error("Cloudinary upload_stream error:", error);
              reject(error);
            } else {
              resolve(res);
            }
          }
        );
        uploadStream.end(file.buffer);
      });
    } else {
      // For file path (disk storage)
      result = await cloudinary.uploader.upload(file.path || file, {
        resource_type: "video",
        folder,
        use_filename: true,
      });
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary video upload error:", error);
    throw new Error("Video upload failed");
  }
};

export const deleteVideo = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    console.error("Cloudinary video delete error:", error);
    throw new Error("Video delete failed");
  }
};

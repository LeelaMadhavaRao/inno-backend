import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fileUploadService from './src/services/fileUploadService.js';
import Gallery from './src/models/gallery.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const fixGalleryUrls = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all gallery items with null or empty URLs
    const photos = await Gallery.find({
      $or: [
        { url: { $exists: false } },
        { url: null },
        { url: '' }
      ]
    });

    console.log(`Found ${photos.length} photos with missing URLs`);

    for (const photo of photos) {
      if (photo.filename) {
        const newUrl = fileUploadService.getFileUrl(photo.filename, 'gallery');
        await Gallery.findByIdAndUpdate(photo._id, { url: newUrl });
        console.log(`Updated photo ${photo._id}: ${photo.title} -> ${newUrl}`);
      } else {
        console.log(`Photo ${photo._id} has no filename, skipping`);
      }
    }

    console.log('Gallery URL fix completed');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing gallery URLs:', error);
    process.exit(1);
  }
};

fixGalleryUrls();

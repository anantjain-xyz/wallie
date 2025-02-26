import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Get Space name and region from environment variables
const spaceName = import.meta.env.VITE_DO_SPACE_NAME || '';
const region = import.meta.env.VITE_DO_REGION || 'nyc3';
const accessKeyId = import.meta.env.VITE_DO_ACCESS_KEY_ID || '';
const secretAccessKey = import.meta.env.VITE_DO_SECRET_ACCESS_KEY || '';

// DigitalOcean Spaces configuration
const spacesClient = new S3Client({
  region: region,
  endpoint: `https://${region}.digitaloceanspaces.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  forcePathStyle: true
});

/**
 * Uploads a file to DigitalOcean Spaces and returns the URL
 * @param file The file to upload
 * @param prefix Optional prefix for the object key
 * @returns The URL of the uploaded file
 */
export async function uploadFileToS3(file: File, prefix = 'logos'): Promise<string> {
  if (!spaceName) {
    throw new Error('DigitalOcean Space name is not configured');
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('DigitalOcean credentials are not properly configured');
  }

  // Generate a unique filename
  const fileExtension = file.name.split('.').pop();
  const fileName = `${prefix}/${uuidv4()}.${fileExtension}`;

  try {
    
    // Convert File to ArrayBuffer
    const fileArrayBuffer = await file.arrayBuffer();
    
    // Create the command to put the object in Spaces
    const command = new PutObjectCommand({
      Bucket: spaceName,
      Key: fileName,
      Body: new Uint8Array(fileArrayBuffer),
      ContentType: file.type,
      ACL: 'public-read',
    });

    // Send the command directly to DigitalOcean Spaces
    await spacesClient.send(command);

    // Return the public URL of the file
    const publicUrl = `https://${spaceName}.${region}.digitaloceanspaces.com/${fileName}`;
    return publicUrl;
  } catch (error) {
    throw error;
  }
} 
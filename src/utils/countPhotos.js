const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { s3Client } = require('./s3-credentials');

exports.countUserPhotos = async (userId) => {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: `users/${userId}/`,
        };

        const command = new ListObjectsV2Command(params);
        const response = await s3Client.send(command);
        
        if (!response.Contents) {
            return 0;
        }

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const photoCount = response.Contents.filter(obj => {
            const key = obj.Key.toLowerCase();
            return imageExtensions.some(ext => key.endsWith(ext));
        }).length;

        return photoCount;
    } catch (error) {
        console.error('Error counting photos:', error);
        throw new Error('Failed to count existing photos');
    }
};

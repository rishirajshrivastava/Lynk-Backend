const { DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('./s3-credentials');

// Delete a single object from S3
exports.deleteObject = async (key) => {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key
        };

        const command = new DeleteObjectCommand(params);
        const data = await s3Client.send(command);
        
        if (data.$metadata.httpStatusCode !== 204) {
            throw new Error("Failed to delete file from S3");
        }

        console.log(`Successfully deleted: ${key}`);
        return { success: true, key: key };
    } catch (error) {
        console.error("Error deleting file from S3:", error);
        throw error;
    }
};

// Delete multiple objects from S3
exports.deleteObjects = async (keys) => {
    try {
        if (!keys || keys.length === 0) {
            return { success: true, deletedCount: 0 };
        }

        const objects = keys.map(key => ({ Key: key }));
        
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Delete: {
                Objects: objects,
                Quiet: false
            }
        };

        const command = new DeleteObjectsCommand(params);
        const data = await s3Client.send(command);
        
        console.log(`Successfully deleted ${data.Deleted?.length || 0} objects`);
        return { 
            success: true, 
            deletedCount: data.Deleted?.length || 0,
            deletedKeys: data.Deleted?.map(obj => obj.Key) || []
        };
    } catch (error) {
        console.error("Error deleting files from S3:", error);
        throw error;
    }
};

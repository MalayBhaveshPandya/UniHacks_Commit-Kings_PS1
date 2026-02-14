import api from './api';

export const uploadService = {
    /**
     * Upload a file (image or video) to Cloudinary via backend.
     * @param {File} file - The file to upload
     * @param {function} onProgress - Optional progress callback (0-100)
     * @returns {Promise<{url, publicId, resourceType, format, width, height, bytes, duration}>}
     */
    async uploadFile(file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 120000, // 2 min timeout for large uploads
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            },
        });

        return data;
    },

    /**
     * Upload multiple files to Cloudinary
     * @param {File[]} files - Array of files to upload
     * @param {function} onProgress - Optional progress callback (0-100)
     * @returns {Promise<Array>}
     */
    async uploadMultiple(files, onProgress) {
        const results = [];
        for (let i = 0; i < files.length; i++) {
            const result = await this.uploadFile(files[i], (percent) => {
                if (onProgress) {
                    const overall = Math.round(((i * 100) + percent) / files.length);
                    onProgress(overall);
                }
            });
            results.push(result);
        }
        return results;
    },
};

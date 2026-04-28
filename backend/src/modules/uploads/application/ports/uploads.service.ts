export type SignedUploadIntent = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
};

export interface UploadsService {
  createSignedUploadIntent(input: {
    key: string;
    contentType: string;
  }): Promise<SignedUploadIntent>;
}

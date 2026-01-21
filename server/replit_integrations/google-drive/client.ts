import { google, drive_v3 } from 'googleapis';
import crypto from 'crypto';
import { Readable } from 'stream';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGoogleDriveClient(): Promise<drive_v3.Drive> {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Encryption key management for call recordings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  // Use a derived key from environment or generate one
  const secret = process.env.CALL_RECORDING_SECRET || 'coyn-messenger-default-secret-key-32b';
  return crypto.scryptSync(secret, 'coyn-salt', 32);
}

export function encryptBuffer(data: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

export function decryptBuffer(encrypted: Buffer, ivHex: string, authTagHex: string): Buffer {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getEncryptionKey();
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// Find or create COYN recordings folder
async function getOrCreateRecordingsFolder(drive: drive_v3.Drive): Promise<string> {
  const folderName = 'COYN Call Recordings';
  
  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  
  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }
  
  // Create folder if it doesn't exist
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  
  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id'
  });
  
  return folder.data.id!;
}

export interface CallRecordingMetadata {
  callId: string;
  callerAddress: string;
  receiverAddress: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: 'voice' | 'video';
  iv: string;
  authTag: string;
}

export async function uploadEncryptedRecording(
  audioData: Buffer,
  metadata: Omit<CallRecordingMetadata, 'iv' | 'authTag'>
): Promise<{ fileId: string; metadata: CallRecordingMetadata }> {
  const drive = await getUncachableGoogleDriveClient();
  const folderId = await getOrCreateRecordingsFolder(drive);
  
  // Encrypt the audio data
  const { encrypted, iv, authTag } = encryptBuffer(audioData);
  
  const fullMetadata: CallRecordingMetadata = {
    ...metadata,
    iv,
    authTag
  };
  
  // Create filename with timestamp
  const timestamp = new Date(metadata.startTime).toISOString().replace(/[:.]/g, '-');
  const fileName = `call_${metadata.type}_${timestamp}_${metadata.callId.slice(0, 8)}.enc`;
  
  // Upload encrypted file
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    description: JSON.stringify(fullMetadata),
    properties: {
      callId: metadata.callId,
      callerAddress: metadata.callerAddress,
      receiverAddress: metadata.receiverAddress,
      type: metadata.type,
      encrypted: 'true'
    }
  };
  
  const media = {
    mimeType: 'application/octet-stream',
    body: Readable.from(encrypted)
  };
  
  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink'
  });
  
  return {
    fileId: file.data.id!,
    metadata: fullMetadata
  };
}

export async function downloadAndDecryptRecording(fileId: string): Promise<{
  data: Buffer;
  metadata: CallRecordingMetadata;
}> {
  const drive = await getUncachableGoogleDriveClient();
  
  // Get file metadata to retrieve encryption params
  const fileInfo = await drive.files.get({
    fileId,
    fields: 'description'
  });
  
  const metadata: CallRecordingMetadata = JSON.parse(fileInfo.data.description || '{}');
  
  // Download encrypted content
  const response = await drive.files.get({
    fileId,
    alt: 'media'
  }, {
    responseType: 'arraybuffer'
  });
  
  const encrypted = Buffer.from(response.data as ArrayBuffer);
  const decrypted = decryptBuffer(encrypted, metadata.iv, metadata.authTag);
  
  return {
    data: decrypted,
    metadata
  };
}

export async function listCallRecordings(walletAddress?: string): Promise<Array<{
  fileId: string;
  name: string;
  metadata: CallRecordingMetadata;
  createdTime: string;
}>> {
  const drive = await getUncachableGoogleDriveClient();
  const folderId = await getOrCreateRecordingsFolder(drive);
  
  let query = `'${folderId}' in parents and trashed=false`;
  if (walletAddress) {
    query += ` and (properties has { key='callerAddress' and value='${walletAddress}' } or properties has { key='receiverAddress' and value='${walletAddress}' })`;
  }
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, description, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 100
  });
  
  return (response.data.files || []).map(file => ({
    fileId: file.id!,
    name: file.name!,
    metadata: JSON.parse(file.description || '{}'),
    createdTime: file.createdTime!
  }));
}

export async function deleteCallRecording(fileId: string): Promise<void> {
  const drive = await getUncachableGoogleDriveClient();
  await drive.files.delete({ fileId });
}

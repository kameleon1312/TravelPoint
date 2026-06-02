// Minimal type stub for expo-image-picker.
// Replace with the real package types after running: pnpm install
declare module 'expo-image-picker' {
  export type MediaType = 'images' | 'videos' | 'livePhotos';

  export interface ImagePickerOptions {
    mediaTypes?:     MediaType | MediaType[];
    quality?:        number;
    base64?:         boolean;
    exif?:           boolean;
    selectionLimit?: number;
    allowsEditing?:  boolean;
  }

  export interface ImagePickerAsset {
    uri:       string;
    width:     number;
    height:    number;
    type?:     string;
    mimeType?: string;
    base64?:   string;
    exif?:     Record<string, unknown>;
    fileName?: string;
    fileSize?: number;
  }

  export interface ImagePickerSuccessResult {
    canceled: false;
    assets:   ImagePickerAsset[];
  }

  export interface ImagePickerCanceledResult {
    canceled: true;
    assets:   null;
  }

  export type ImagePickerResult =
    | ImagePickerSuccessResult
    | ImagePickerCanceledResult;

  export interface PermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    granted: boolean;
    canAskAgain: boolean;
    expires: 'never' | number;
  }

  export function requestCameraPermissionsAsync(): Promise<PermissionResponse>;
  export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse>;

  export function launchCameraAsync(
    options?: ImagePickerOptions,
  ): Promise<ImagePickerResult>;

  export function launchImageLibraryAsync(
    options?: ImagePickerOptions,
  ): Promise<ImagePickerResult>;
}

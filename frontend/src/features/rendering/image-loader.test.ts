import { describe, it, expect } from 'vitest';
import {
  isRemoteUrl,
  isDangerousProtocol,
  isPathTraversal,
  encodeAssetPath,
  resolveAssetUrl,
} from './image-loader';

describe('image-loader unit tests (US-011.1)', () => {
  describe('isRemoteUrl', () => {
    it('detects HTTP and HTTPS URLs', () => {
      expect(isRemoteUrl('https://example.com/image.png')).toBe(true);
      expect(isRemoteUrl('http://insecure.org/test.jpg')).toBe(true);
      expect(isRemoteUrl('HTTPS://UPPERCASE.COM/IMG.PNG')).toBe(true);
    });

    it('detects protocol-relative URLs', () => {
      expect(isRemoteUrl('//cdn.example.com/asset.svg')).toBe(true);
    });

    it('returns false for relative and local paths', () => {
      expect(isRemoteUrl('./images/logo.png')).toBe(false);
      expect(isRemoteUrl('images/arch.png')).toBe(false);
      expect(isRemoteUrl('sample.png')).toBe(false);
      expect(isRemoteUrl('../assets/diagram.png')).toBe(false);
    });
  });

  describe('isDangerousProtocol', () => {
    it('detects dangerous script and data schemes', () => {
      expect(isDangerousProtocol('javascript:alert(1)')).toBe(true);
      expect(isDangerousProtocol('data:image/svg+xml;base64,PHN2Zz4=')).toBe(true);
      expect(isDangerousProtocol('file:///etc/passwd')).toBe(true);
      expect(isDangerousProtocol('vbscript:msgbox(1)')).toBe(true);
      expect(isDangerousProtocol('about:blank')).toBe(true);
      expect(isDangerousProtocol('blob:https://example.com/uuid')).toBe(true);
    });

    it('returns false for safe relative paths', () => {
      expect(isDangerousProtocol('./images/pic.png')).toBe(false);
      expect(isDangerousProtocol('assets/photo.jpg')).toBe(false);
    });
  });

  describe('isPathTraversal', () => {
    it('detects parent directory escape outside root', () => {
      expect(isPathTraversal('../outside.png')).toBe(true);
      expect(isPathTraversal('../../etc/shadow')).toBe(true);
      expect(isPathTraversal('assets/../../escape.png')).toBe(true);
    });

    it('allows valid subfolder navigation that stays within root', () => {
      expect(isPathTraversal('assets/sub/../sample.png')).toBe(false);
      expect(isPathTraversal('./assets/sub/nested.png')).toBe(false);
    });

    it('detects absolute unix paths and windows drive roots', () => {
      expect(isPathTraversal('/etc/passwd')).toBe(true);
      expect(isPathTraversal('/assets/sample.png')).toBe(true);
      expect(isPathTraversal('C:\\Windows\\system.png')).toBe(true);
      expect(isPathTraversal('d:/assets/img.jpg')).toBe(true);
      expect(isPathTraversal('\\\\server\\share\\img.png')).toBe(true);
    });

    it('detects null byte injection', () => {
      expect(isPathTraversal('assets/sample.png\0.jpg')).toBe(true);
      expect(isPathTraversal('assets/sample.png%00.jpg')).toBe(true);
    });
  });

  describe('encodeAssetPath', () => {
    it('normalizes leading dot-slash and preserves path segments', () => {
      expect(encodeAssetPath('./assets/sample.png')).toBe('assets/sample.png');
      expect(encodeAssetPath('images/logo.png')).toBe('images/logo.png');
    });

    it('URI-encodes spaces and Unicode characters', () => {
      expect(encodeAssetPath('assets/spaces in name.png')).toBe('assets/spaces%20in%20name.png');
      expect(encodeAssetPath('assets/تصویر فارسی.png')).toBe(
        `assets/${encodeURIComponent('تصویر فارسی.png')}`
      );
    });

    it('preserves query strings and fragment identifiers', () => {
      expect(encodeAssetPath('assets/sample.png?v=2#preview')).toBe('assets/sample.png?v=2#preview');
      expect(encodeAssetPath('assets/my photo.jpg?size=large')).toBe('assets/my%20photo.jpg?size=large');
    });
  });

  describe('resolveAssetUrl (AC 1, AC 3, AC 5)', () => {
    it('resolves relative local image paths to /local-asset custom endpoint', () => {
      const res = resolveAssetUrl('./images/diagram.png');
      expect(res.isBlocked).toBe(false);
      expect(res.isRelative).toBe(true);
      expect(res.resolvedSrc).toBe('/local-asset/images/diagram.png');
    });

    it('resolves image paths containing spaces and Unicode', () => {
      const resSpace = resolveAssetUrl('assets/spaces in name.png');
      expect(resSpace.isBlocked).toBe(false);
      expect(resSpace.resolvedSrc).toBe('/local-asset/assets/spaces%20in%20name.png');

      const resUnicode = resolveAssetUrl('assets/تصویر فارسی.png');
      expect(resUnicode.isBlocked).toBe(false);
      expect(resUnicode.resolvedSrc).toBe(
        `/local-asset/assets/${encodeURIComponent('تصویر فارسی.png')}`
      );
    });

    it('blocks remote images by default per FR-ASSET-004', () => {
      const resHttps = resolveAssetUrl('https://example.com/logo.png');
      expect(resHttps.isBlocked).toBe(true);
      expect(resHttps.isRemote).toBe(true);
      expect(resHttps.resolvedSrc).toBeNull();
      expect(resHttps.errorMessage).toContain('Remote images are blocked by default');
    });

    it('allows remote images only when allowRemote is explicitly true', () => {
      const res = resolveAssetUrl('https://example.com/logo.png', { allowRemote: true });
      expect(res.isBlocked).toBe(false);
      expect(res.isRemote).toBe(true);
      expect(res.resolvedSrc).toBe('https://example.com/logo.png');
    });

    it('blocks dangerous protocol injections (javascript, data, file)', () => {
      const resJs = resolveAssetUrl('javascript:alert(1)');
      expect(resJs.isBlocked).toBe(true);
      expect(resJs.resolvedSrc).toBeNull();

      const resData = resolveAssetUrl('data:image/png;base64,iVBORw0KGgo=');
      expect(resData.isBlocked).toBe(true);
      expect(resData.resolvedSrc).toBeNull();

      const resFile = resolveAssetUrl('file:///etc/passwd');
      expect(resFile.isBlocked).toBe(true);
      expect(resFile.resolvedSrc).toBeNull();
    });

    it('blocks path traversal and absolute paths (PRD 8.1)', () => {
      const resTraversal = resolveAssetUrl('../../../../etc/shadow');
      expect(resTraversal.isBlocked).toBe(true);
      expect(resTraversal.resolvedSrc).toBeNull();
      expect(resTraversal.errorMessage).toContain('Path traversal');

      const resAbs = resolveAssetUrl('/etc/passwd');
      expect(resAbs.isBlocked).toBe(true);
      expect(resAbs.resolvedSrc).toBeNull();
    });

    it('handles empty or whitespace strings safely', () => {
      const resEmpty = resolveAssetUrl('   ');
      expect(resEmpty.isBlocked).toBe(true);
      expect(resEmpty.resolvedSrc).toBeNull();
    });
  });
});

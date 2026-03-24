import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';
import 'package:encrypt/encrypt.dart' as encrypt;

/// Shared AES-256 key (must match backend and frontend).
/// In production, this should come from secure storage or env vars.
const String _symmetricKey = 'xJSJGB6vtXCjeljCNQ5hD0GeQXDMRtQ/ZjMFifrYBb8=';

final _key = encrypt.Key.fromBase64(_symmetricKey);

/// Encrypt a JSON-serializable Map into a Base64 string with random IV prepended.
String encryptPayload(Map<String, dynamic> data) {
  final jsonStr = jsonEncode(data);
  final iv = encrypt.IV.fromSecureRandom(16);

  final encrypter = encrypt.Encrypter(
    encrypt.AES(_key, mode: encrypt.AESMode.cbc, padding: 'PKCS7'),
  );
  final encrypted = encrypter.encryptBytes(utf8.encode(jsonStr), iv: iv);

  // Combine IV + Ciphertext
  final combined = Uint8List.fromList(iv.bytes + encrypted.bytes);
  return base64.encode(combined);
}

/// Decrypt a Base64 string (with prepended IV) into a Map.
Map<String, dynamic> decryptPayload(String encryptedStr) {
  // Strip surrounding quotes if present (backend wraps in JSON quotes)
  final cleanStr = encryptedStr.replaceAll(RegExp(r'^"|"$'), '');
  final rawBytes = base64.decode(cleanStr);

  if (rawBytes.length < 16) {
    throw Exception('Encrypted data too short');
  }

  final iv = encrypt.IV(Uint8List.fromList(rawBytes.sublist(0, 16)));
  final ciphertext = encrypt.Encrypted(Uint8List.fromList(rawBytes.sublist(16)));

  final encrypter = encrypt.Encrypter(
    encrypt.AES(_key, mode: encrypt.AESMode.cbc, padding: 'PKCS7'),
  );

  final decryptedStr = encrypter.decrypt(ciphertext, iv: iv);
  return jsonDecode(decryptedStr) as Map<String, dynamic>;
}

/// Decrypt a response body string into a dynamic value (can be List or Map).
dynamic decryptResponseBody(String responseBody) {
  // Strip surrounding quotes if present
  final cleanStr = responseBody.replaceAll(RegExp(r'^"|"$'), '');
  final rawBytes = base64.decode(cleanStr);

  if (rawBytes.length < 16) {
    throw Exception('Encrypted data too short');
  }

  final iv = encrypt.IV(Uint8List.fromList(rawBytes.sublist(0, 16)));
  final ciphertext = encrypt.Encrypted(Uint8List.fromList(rawBytes.sublist(16)));

  final encrypter = encrypt.Encrypter(
    encrypt.AES(_key, mode: encrypt.AESMode.cbc, padding: 'PKCS7'),
  );

  final decryptedStr = encrypter.decrypt(ciphertext, iv: iv);
  return jsonDecode(decryptedStr);
}

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/encryption.dart';
import 'auth_service.dart';

/// Centralized API client that handles:
/// - JWT token attachment
/// - AES-256-CBC encryption of request bodies
/// - AES-256-CBC decryption of response bodies
class ApiClient {
  static final String baseUrl = AuthService.baseUrl;

  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Sends a POST request with an encrypted JSON body and decrypts the response.
  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final encryptedBody = encryptPayload(body);

    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      // Send the encrypted string as a quoted JSON string
      body: jsonEncode(encryptedBody),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decryptResponse(response.body);
    } else {
      throw ApiException(response.statusCode, _tryDecryptError(response.body));
    }
  }

  /// Sends a PUT request with an encrypted JSON body and decrypts the response.
  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final encryptedBody = encryptPayload(body);

    final response = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: jsonEncode(encryptedBody),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decryptResponse(response.body);
    } else {
      throw ApiException(response.statusCode, _tryDecryptError(response.body));
    }
  }

  /// Sends a DELETE request (no encryption needed for delete).
  static Future<dynamic> delete(String path) async {
    final headers = await _getHeaders();

    final response = await http.delete(
      Uri.parse('$baseUrl$path'),
      headers: headers,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return _decryptResponse(response.body);
    } else {
      throw ApiException(response.statusCode, _tryDecryptError(response.body));
    }
  }

  /// Sends a multipart POST (for file uploads — NOT encrypted).
  static Future<http.Response> multipartPost(
    String path,
    String filePath,
    Map<String, String> fields,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');

    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.fields.addAll(fields);
    request.files.add(await http.MultipartFile.fromPath('file', filePath));

    var streamedResponse = await request.send();
    return http.Response.fromStream(streamedResponse);
  }

  static dynamic _decryptResponse(String body) {
    try {
      return decryptResponseBody(body);
    } catch (_) {
      // Fallback: try plain JSON (for non-encrypted responses)
      try {
        return jsonDecode(body);
      } catch (_) {
        return body;
      }
    }
  }

  static String _tryDecryptError(String body) {
    try {
      final data = _decryptResponse(body);
      if (data is Map && data.containsKey('detail')) {
        return data['detail'].toString();
      }
      return body;
    } catch (_) {
      return body;
    }
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

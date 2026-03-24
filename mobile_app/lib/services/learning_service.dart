import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/learning.dart';
import '../utils/encryption.dart';
import 'auth_service.dart';

class LearningService {
  final String baseUrl = AuthService.baseUrl;

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<ClassCourseGroup>> getLearningClasses(String clientId) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/learning/classes'),
      headers: headers,
      body: json.encode(encryptPayload({'client_id': clientId})),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
      return data.map((json) => ClassCourseGroup.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load learning data');
    }
  }

  Future<bool> bulkUploadCourses(String filepath, String clientId) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/courses/bulk-upload'));
    
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['client_id'] = clientId;
    
    request.files.add(await http.MultipartFile.fromPath('file', filepath));
    
    var streamedResponse = await request.send();
    var response = await http.Response.fromStream(streamedResponse);
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return true;
    } else {
      print('LMS Upload failed: ${response.body}');
      return false;
    }
  }
}

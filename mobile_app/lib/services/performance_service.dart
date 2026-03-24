import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/performance.dart';
import '../models/record_attendance.dart';
import '../utils/encryption.dart';
import 'auth_service.dart';

class PerformanceService {
  final String baseUrl = AuthService.baseUrl;

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<Performance>> getStudentPerformance(int userId, String clientId) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/students/performance'),
      headers: headers,
      body: json.encode(encryptPayload({'client_id': clientId, 'user_id': userId})),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
      return data.map((json) => Performance.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load performance data');
    }
  }

  Future<List<CoursePerformanceSummary>> getPerformanceSummary(String clientId) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/performance/summary'),
      headers: headers,
      body: json.encode(encryptPayload({'client_id': clientId})),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
      return data.map((json) => CoursePerformanceSummary.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load performance summary');
    }
  }

  Future<List<StudentPerformanceDetail>> getPerformanceDetails(
      int courseId, String className, String clientId) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/performance/details'),
      headers: headers,
      body: json.encode(encryptPayload({
        'course_id': courseId,
        'class_name': className,
        'client_id': clientId,
      })),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
      return data.map((json) => StudentPerformanceDetail.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load performance details');
    }
  }

  Future<BulkUploadResult?> uploadBulkCsv(String filepath, String clientId) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/performance/upload/'));
    
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['client_id'] = clientId;
    
    request.files.add(await http.MultipartFile.fromPath('file', filepath));
    
    var streamedResponse = await request.send();
    var response = await http.Response.fromStream(streamedResponse);
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = json.decode(response.body);
      // Attempting to heuristically map message payload to our struct, since the 
      // result payload format isn't as strictly defined as the attendance one.
      String msg = data['message'] ?? '';
      
      return BulkUploadResult(
        added: msg.contains('imported') ? 1 : 0, 
        updated: 0,
        errors: [],
      );
    } else {
      print('Upload failed: ${response.body}');
      return null;
    }
  }
}

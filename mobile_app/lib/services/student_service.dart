import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/student.dart';
import '../services/auth_service.dart';
import '../utils/encryption.dart';

class StudentService {
  final String baseUrl = AuthService.baseUrl;

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  Future<List<StudentBasic>> listStudents(String clientId) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/students/list/'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(encryptPayload({'client_id': clientId})),
      );

      if (response.statusCode == 200) {
        final List data = decryptResponseBody(response.body) as List;
        return data.map((item) => StudentBasic.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      print('List Students Error: $e');
      return [];
    }
  }

  Future<bool> createStudent(StudentCreate student) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/students/'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(encryptPayload(student.toJson())),
      );

      return response.statusCode == 201;
    } catch (e) {
      print('Create Student Error: $e');
      return false;
    }
  }

  Future<bool> deleteStudent(int userId, String clientId) async {
    final token = await _getToken();
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/students/$userId?client_id=$clientId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Delete Student Error: $e');
      return false;
    }
  }

  Future<bool> uploadStudentsCsv(String filePath, String clientId) async {
    final token = await _getToken();
    try {
      var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/students/upload/'));
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['client_id'] = clientId;
      request.files.add(await http.MultipartFile.fromPath('file', filePath));

      var response = await request.send();
      return response.statusCode == 200;
    } catch (e) {
      print('Student Upload Error: $e');
      return false;
    }
  }
}

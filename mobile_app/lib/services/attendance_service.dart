// lib/services/attendance_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/attendance.dart';
import '../models/record_attendance.dart';
import '../utils/encryption.dart';
import 'auth_service.dart';

class AttendanceService {
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  Future<List<Attendance>> getStudentAttendance(int userId, String clientId) async {
    final response = await getStudentAttendanceDetailed(userId, clientId);
    if (response.statusCode == 200) {
      final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
      return data.map((json) => Attendance.fromJson(json)).toList();
    }
    return [];
  }

  Future<http.Response> getStudentAttendanceDetailed(int userId, String clientId) async {
    final token = await getToken();
    if (token == null) return http.Response('No token', 401);

    return await http.post(
      Uri.parse('${AuthService.baseUrl}/students/attendance'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(encryptPayload({'client_id': clientId, 'user_id': userId})),
    );
  }

  Future<List<AttendanceSummaryRecord>> getAttendanceSummary(String clientId) async {
    final token = await getToken();
    if (token == null) return [];

    try {
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/attendance/summary'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(encryptPayload({'client_id': clientId})),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
        return data.map((json) => AttendanceSummaryRecord.fromJson(json)).toList();
      } else {
        print('Error fetching attendance summary: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('Exception fetching attendance summary: $e');
      return [];
    }
  }

  // --- Record Attendance Methods ---

  Future<List<ClassSectionInfo>> getClasses(String clientId) async {
    final token = await getToken();
    if (token == null) return [];

    try {
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/classes'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(encryptPayload({'client_id': clientId})),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
        return data.map((json) => ClassSectionInfo.fromJson(json)).toList();
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  Future<List<StudentBasic>> getStudentsByClass(String className, String section, String clientId) async {
    final token = await getToken();
    if (token == null) return [];

    try {
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/students/by-class'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(encryptPayload({
          'client_id': clientId,
          'class_name': className,
          'section': section,
        })),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = decryptResponseBody(response.body) as List<dynamic>;
        return data.map((json) => StudentBasic.fromJson(json)).toList();
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  Future<bool> recordStatus(int studentId, String date, String status, String clientId) async {
    final token = await getToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/attendance/record'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(encryptPayload({
          'student_id': studentId,
          'date': date,
          'status': status,
          'client_id': clientId,
        })),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<BulkUploadResult?> uploadBulkCsv(String filePath, String clientId) async {
    final token = await getToken();
    if (token == null) return null;

    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('${AuthService.baseUrl}/attendance/bulk-upload'),
      );
      
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['client_id'] = clientId;
      
      request.files.add(await http.MultipartFile.fromPath('file', filePath));

      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return BulkUploadResult.fromJson(jsonDecode(response.body));
      } else {
        print('Upload Failed: ${response.statusCode} - ${response.body}');
        return null;
      }
    } catch (e) {
      print('Exception uploading CSV: $e');
      return null;
    }
  }
}

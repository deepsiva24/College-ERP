import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/finance.dart';
import '../services/auth_service.dart';
import '../utils/encryption.dart';

class FinanceService {
  final String baseUrl = AuthService.baseUrl;

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  Future<List<ClassFeeSummary>> getFinanceSummary(String clientId) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/finance/summary'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(encryptPayload({'client_id': clientId})),
      );

      if (response.statusCode == 200) {
        final List data = decryptResponseBody(response.body) as List;
        return data.map((item) => ClassFeeSummary.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      print('Finance Summary Error: $e');
      return [];
    }
  }

  Future<List<StudentFeeDetail>> getClassFeeDetails(String className, String clientId) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/finance/class-details'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(encryptPayload({'client_id': clientId, 'class_name': className})),
      );

      if (response.statusCode == 200) {
        final List data = decryptResponseBody(response.body) as List;
        return data.map((item) => StudentFeeDetail.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      print('Class Fee Details Error: $e');
      return [];
    }
  }

  Future<bool> payFee(int recordId, double amount, String clientId) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/finance/pay/$recordId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(encryptPayload({
          'client_id': clientId,
          'amount_paid': amount,
        })),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Pay Fee Error: $e');
      return false;
    }
  }

  Future<bool> uploadFeesCsv(String filePath, String clientId) async {
    final token = await _getToken();
    try {
      var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/finance/upload/'));
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['client_id'] = clientId;
      request.files.add(await http.MultipartFile.fromPath('file', filePath));

      var response = await request.send();
      return response.statusCode == 200;
    } catch (e) {
      print('Finance Upload Error: $e');
      return false;
    }
  }
}

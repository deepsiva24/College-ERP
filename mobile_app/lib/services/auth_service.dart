import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../utils/encryption.dart';

class AuthService {
  // Use the deployed GCP backend URL
  static const String baseUrl = 'https://school-erp-backend-u3blupf3zq-uc.a.run.app';

  Future<User?> login(String email, String password, String clientId) async {
    try {
      // Encrypt login credentials before sending
      final encryptedBody = encryptPayload({
        'email': email,
        'password': password,
        'client_id': clientId,
      });

      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(encryptedBody),
      );

      if (response.statusCode == 200) {
        // Decrypt the response
        Map<String, dynamic> data;
        try {
          data = decryptPayload(response.body) as Map<String, dynamic>;
        } catch (_) {
          // Fallback for non-encrypted response
          data = jsonDecode(response.body);
        }
        
        // Save User metadata locally for persistent login
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['access_token']);
        await prefs.setInt('user_id', data['id']);
        await prefs.setString('user_email', data['email']);
        await prefs.setString('user_role', data['role']);
        await prefs.setString('client_id', data['client_id']);
        await prefs.setString('first_name', data['first_name'] ?? "");
        await prefs.setString('last_name', data['last_name'] ?? "");
        await prefs.setString('class_name', data['class_name'] ?? "");

        return User.fromJson(data);
      } else {
        print('Login failed with status: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('Login error: $e');
      return null;
    }
  }

  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    if (token == null) return null;

    final id = prefs.getInt('user_id');
    final email = prefs.getString('user_email');
    final role = prefs.getString('user_role');
    final clientId = prefs.getString('client_id');
    final firstName = prefs.getString('first_name');
    final lastName = prefs.getString('last_name');
    final className = prefs.getString('class_name');

    if (id != null && email != null && role != null && clientId != null) {
      return User(
        id: id, 
        email: email, 
        role: role, 
        clientId: clientId,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        className: className ?? "",
      );
    }
    return null;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('user_id');
    await prefs.remove('user_role');
    // Keeping client_id and user_email for auto-population on login screen
  }
}

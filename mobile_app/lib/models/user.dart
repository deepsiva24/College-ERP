class User {
  final int id;
  final String email;
  final String role;
  final String clientId;
  final String firstName;
  final String lastName;
  final String className;

  User({
    required this.id,
    required this.email,
    required this.role,
    required this.clientId,
    required this.firstName,
    required this.lastName,
    required this.className,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      role: json['role'],
      clientId: json['client_id'],
      firstName: json['first_name'] ?? "",
      lastName: json['last_name'] ?? "",
      className: json['class_name'] ?? "",
    );
  }
}

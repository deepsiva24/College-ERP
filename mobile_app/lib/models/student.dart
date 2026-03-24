class StudentBasic {
  final int id;
  final String email;
  final String firstName;
  final String lastName;
  final String? admissionId;
  final String? className;
  final String? section;

  StudentBasic({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.admissionId,
    this.className,
    this.section,
  });

  factory StudentBasic.fromJson(Map<String, dynamic> json) {
    return StudentBasic(
      id: json['id'],
      email: json['email'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      admissionId: json['admission_id'],
      className: json['class_name'],
      section: json['section'],
    );
  }
}

class StudentCreate {
  final String email;
  final String password;
  final String firstName;
  final String lastName;
  final String clientId;
  final String? phone;
  final String? address;
  final String? gender;
  final String? dateOfBirth;
  final String? admissionId;
  final String? className;
  final String? branch;
  final String? section;
  final String? fatherName;

  StudentCreate({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
    required this.clientId,
    this.phone,
    this.address,
    this.gender,
    this.dateOfBirth,
    this.admissionId,
    this.className,
    this.branch,
    this.section,
    this.fatherName,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
      'first_name': firstName,
      'last_name': lastName,
      'client_id': clientId,
      'phone': phone,
      'address': address,
      'gender': gender,
      'date_of_birth': dateOfBirth,
      'admission_id': admissionId,
      'class_name': className,
      'branch': branch,
      'section': section,
      'father_name': fatherName,
    };
  }
}

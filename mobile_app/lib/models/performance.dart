class Performance {
  final int id;
  final int courseId;
  final String assessmentName;
  final double score;
  final double maxScore;

  Performance({
    required this.id,
    required this.courseId,
    required this.assessmentName,
    required this.score,
    required this.maxScore,
  });

  factory Performance.fromJson(Map<String, dynamic> json) {
    return Performance(
      id: json['id'],
      courseId: json['course_id'],
      assessmentName: json['assessment_name'],
      score: (json['score'] as num).toDouble(),
      maxScore: (json['max_score'] as num).toDouble(),
    );
  }
}

class CoursePerformanceSummary {
  final String? className;
  final int courseId;
  final String courseName;
  final double averageScore;
  final int studentCount;
  final int enrolledStudents;

  CoursePerformanceSummary({
    this.className,
    required this.courseId,
    required this.courseName,
    required this.averageScore,
    required this.studentCount,
    required this.enrolledStudents,
  });

  factory CoursePerformanceSummary.fromJson(Map<String, dynamic> json) {
    return CoursePerformanceSummary(
      className: json['class_name'],
      courseId: json['course_id'],
      courseName: json['course_name'],
      averageScore: (json['average_score'] as num).toDouble(),
      studentCount: json['student_count'],
      enrolledStudents: json['enrolled_students'],
    );
  }
}

class StudentPerformanceDetail {
  final int id;
  final int userId;
  final String? admissionId;
  final String firstName;
  final String lastName;
  final String assessmentName;
  final double score;
  final double maxScore;

  StudentPerformanceDetail({
    required this.id,
    required this.userId,
    this.admissionId,
    required this.firstName,
    required this.lastName,
    required this.assessmentName,
    required this.score,
    required this.maxScore,
  });

  factory StudentPerformanceDetail.fromJson(Map<String, dynamic> json) {
    return StudentPerformanceDetail(
      id: json['id'],
      userId: json['user_id'],
      admissionId: json['admission_id'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      assessmentName: json['assessment_name'],
      score: (json['score'] as num).toDouble(),
      maxScore: (json['max_score'] as num).toDouble(),
    );
  }
}

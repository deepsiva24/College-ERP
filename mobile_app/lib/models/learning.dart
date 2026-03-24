class LearningMaterial {
  final int id;
  final int courseId;
  final String title;
  final String materialType; // PDF, Video, Link
  final String contentUrl;

  LearningMaterial({
    required this.id,
    required this.courseId,
    required this.title,
    required this.materialType,
    required this.contentUrl,
  });

  factory LearningMaterial.fromJson(Map<String, dynamic> json) {
    return LearningMaterial(
      id: json['id'],
      courseId: json['course_id'],
      title: json['title'],
      materialType: json['material_type'],
      contentUrl: json['content_url'],
    );
  }
}

class LearningCourse {
  final int id;
  final String title;
  final String description;
  final List<LearningMaterial> materials;

  LearningCourse({
    required this.id,
    required this.title,
    required this.description,
    required this.materials,
  });

  factory LearningCourse.fromJson(Map<String, dynamic> json) {
    return LearningCourse(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      materials: (json['materials'] as List)
          .map((m) => LearningMaterial.fromJson(m))
          .toList(),
    );
  }
}

class ClassCourseGroup {
  final String className;
  final List<LearningCourse> courses;

  ClassCourseGroup({
    required this.className,
    required this.courses,
  });

  factory ClassCourseGroup.fromJson(Map<String, dynamic> json) {
    return ClassCourseGroup(
      className: json['class_name'],
      courses: (json['courses'] as List)
          .map((c) => LearningCourse.fromJson(c))
          .toList(),
    );
  }
}

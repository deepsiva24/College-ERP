import 'package:flutter/material.dart';

class PlaceholderScreen extends StatelessWidget {
  final String title;
  const PlaceholderScreen({Key? key, required this.title}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        '$title Screen\n(Development in Progress)',
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 20, color: Colors.grey),
      ),
    );
  }
}

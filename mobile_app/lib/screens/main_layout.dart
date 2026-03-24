import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import 'dashboard_screen.dart';
import 'placeholder_screen.dart';
import 'login_screen.dart';
import 'attendance_screen.dart';
import 'record_attendance_screen.dart';
import 'performance_screen.dart';
import 'learning_screen.dart';
import 'finance_screen.dart';
import 'add_student_screen.dart';

class MainLayout extends StatefulWidget {
  final User user;
  
  const MainLayout({Key? key, required this.user}) : super(key: key);

  @override
  _MainLayoutState createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _selectedIndex = 0;
  final AuthService _authService = AuthService();

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      DashboardScreen(user: widget.user),
      RecordAttendanceScreen(user: widget.user),
      AttendanceScreen(user: widget.user),
      PerformanceScreen(user: widget.user),
      LearningScreen(user: widget.user),
      const PlaceholderScreen(title: 'Gallery'),
      AddStudentScreen(user: widget.user),
      FinanceScreen(user: widget.user),
    ];
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    Navigator.pop(context); // Close the drawer
  }

  void _handleLogout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    // Determine screen titles based on selection
    final List<String> titles = [
      'Dashboard',
      'Record Attendance',
      'Attendance',
      'Performance',
      'Learning Management',
      'Gallery',
      'Add Students',
      'Finance',
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_selectedIndex], style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: CircleAvatar(
              backgroundColor: Colors.indigo.shade100,
              child: const Icon(Icons.person, color: Colors.indigo),
            ),
          )
        ],
      ),
      drawer: Drawer(
        child: Container(
          color: Colors.indigo.shade900,
          child: Column(
            children: [
              DrawerHeader(
                decoration: BoxDecoration(
                  color: Colors.indigo.shade900,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.school, color: Colors.indigo, size: 30),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Text(
                        'Gurukul ERP',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    _buildDrawerItem(icon: Icons.home, title: 'Dashboard', index: 0),
                    _buildDrawerItem(icon: Icons.calendar_today, title: 'Record Attendance', index: 1),
                    _buildDrawerItem(icon: Icons.calendar_month, title: 'Attendance', index: 2),
                    _buildDrawerItem(icon: Icons.trending_up, title: 'Performance', index: 3),
                    _buildDrawerItem(icon: Icons.book, title: 'Learning Management', index: 4),
                    _buildDrawerItem(icon: Icons.image, title: 'Gallery', index: 5),
                    _buildDrawerItem(icon: Icons.person_add, title: 'Add Students', index: 6),
                    _buildDrawerItem(icon: Icons.currency_rupee, title: 'Finance', index: 7),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: ListTile(
                  leading: const Icon(Icons.logout, color: Colors.redAccent),
                  title: const Text('Logout', style: TextStyle(color: Colors.white)),
                  onTap: _handleLogout,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  tileColor: Colors.white.withOpacity(0.1),
                ),
              ),
            ],
          ),
        ),
      ),
      body: _screens[_selectedIndex],
    );
  }

  Widget _buildDrawerItem({required IconData icon, required String title, required int index}) {
    final isSelected = _selectedIndex == index;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: isSelected ? Colors.indigo.shade600 : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: isSelected ? Colors.white : Colors.indigo.shade300),
        title: Text(
          title,
          style: TextStyle(color: isSelected ? Colors.white : Colors.indigo.shade200, fontWeight: FontWeight.bold),
        ),
        onTap: () => _onItemTapped(index),
      ),
    );
  }
}

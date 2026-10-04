import 'package:flutter/material.dart';

enum BadgeStatusType {
  managed,
  active,
  normal,
  warning,
  critical,
  inRecovery,
}

class HealthStatusBadge extends StatelessWidget {
  final String label;
  final BadgeStatusType type;

  const HealthStatusBadge({
    super.key,
    required this.label,
    required this.type,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;

    switch (type) {
      case BadgeStatusType.managed:
      case BadgeStatusType.normal:
        bg = const Color(0xFFE8F5E9);
        fg = const Color(0xFF2E7D32);
        break;
      case BadgeStatusType.active:
      case BadgeStatusType.inRecovery:
        bg = const Color(0xFFE0F2F1);
        fg = const Color(0xFF00695C);
        break;
      case BadgeStatusType.warning:
        bg = const Color(0xFFFFF3E0);
        fg = const Color(0xFFE65100);
        break;
      case BadgeStatusType.critical:
        bg = const Color(0xFFFFEBEE);
        fg = const Color(0xFFC62828);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: fg,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

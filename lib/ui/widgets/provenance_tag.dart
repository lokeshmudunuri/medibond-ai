import 'package:flutter/material.dart';
import '../../models/provenance.dart';

class ProvenanceTag extends StatelessWidget {
  final Provenance provenance;
  final bool compact;

  const ProvenanceTag({
    super.key,
    required this.provenance,
    this.compact = true,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    IconData icon;

    switch (provenance.source) {
      case ProvenanceSource.documented:
        bg = const Color(0xFFE8F5E9);
        fg = const Color(0xFF2E7D32);
        icon = Icons.verified_outlined;
        break;
      case ProvenanceSource.userReported:
        bg = const Color(0xFFEDE7F6);
        fg = const Color(0xFF5E35B1);
        icon = Icons.person_outline;
        break;
      case ProvenanceSource.systemDetected:
        bg = const Color(0xFFE0F7FA);
        fg = const Color(0xFF00838F);
        icon = Icons.sensors;
        break;
      case ProvenanceSource.requiresReview:
        bg = const Color(0xFFFFF3E0);
        fg = const Color(0xFFE65100);
        icon = Icons.pending_actions;
        break;
      case ProvenanceSource.urgentEscalation:
        bg = const Color(0xFFFFEBEE);
        fg = const Color(0xFFC62828);
        icon = Icons.warning_amber_rounded;
        break;
    }

    if (compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: fg.withValues(alpha: 0.3), width: 0.8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 11, color: fg),
            const SizedBox(width: 3),
            Text(
              provenance.source.shortCode,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: fg,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Text(
            provenance.source.displayName,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProvenanceSource } from '../types';

interface ProvenanceTagProps {
  source: ProvenanceSource;
  documentName?: string;
}

export const ProvenanceTag: React.FC<ProvenanceTagProps> = ({ source, documentName }) => {
  let bgColor = '#E0F2FE';
  let textColor = '#0369A1';
  let label = '[DOC] Documented';

  if (source === ProvenanceSource.UserReported) {
    bgColor = '#FEF3C7';
    textColor = '#92400E';
    label = '[USER] Reported';
  } else if (source === ProvenanceSource.SystemDetected) {
    bgColor = '#DCFCE7';
    textColor = '#15803D';
    label = '[SYS] Sensor Detected';
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>
        {label}
        {documentName ? ` • ${documentName}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
});

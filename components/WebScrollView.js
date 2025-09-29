import React from 'react';
import { ScrollView, Platform } from 'react-native';

const WebScrollView = ({ children, style, contentContainerStyle, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <div 
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          ...style
        }}
        {...props}
      >
        <div style={contentContainerStyle}>
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <ScrollView 
      style={style}
      contentContainerStyle={contentContainerStyle}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default WebScrollView;

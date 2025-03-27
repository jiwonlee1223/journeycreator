
import React from 'react';
import SocketClient from '../components/SocketClient';
import GridGraph from '../components/GridGragph'

const HomePage: React.FC = () => {
  return (
    <div style={{ padding: 20 }}>
      <GridGraph/>
    </div>
  );
};

export default HomePage;
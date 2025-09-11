import http from 'http';

const createAdminUser = async () => {
  const postData = JSON.stringify({
    name: 'System Administrator',
    email: 'admin@innoverse.com',
    password: 'admin123',
    role: 'admin'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 201) {
          console.log('✅ Admin user created successfully!');
          console.log('📧 Email: admin@innoverse.com');
          console.log('🔑 Password: admin123');
          console.log('👤 Name:', response.name);
          console.log('🎭 Role:', response.role);
        } else if (res.statusCode === 400 && response.message === 'User already exists') {
          console.log('✅ Admin user already exists! You can use the credentials:');
          console.log('📧 Email: admin@innoverse.com');
          console.log('🔑 Password: admin123');
        } else {
          console.log('❌ Error creating admin user:', response.message);
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Failed to create admin user:', error.message);
  });

  req.write(postData);
  req.end();
};

createAdminUser();

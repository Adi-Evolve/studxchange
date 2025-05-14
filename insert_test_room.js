// Deprecated: This file is no longer used. Backend has migrated to Supabase.
(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  const client = await MongoClient.connect(uri, { useUnifiedTopology: true });
  const db = client.db();
  const rooms = db.collection('rooms');

  // Remove any existing room with this _id (cleanup)
  await rooms.deleteOne({ _id: new ObjectId('681ee09007da76869c2d9bb7') });

  // Insert test room
  const result = await rooms.insertOne({
    _id: new ObjectId('681ee09007da76869c2d9bb7'),
    title: 'Test Room',
    location: 'Demo City',
    type: 'Single',
    price: '1000',
    description: 'A test room for debugging.',
    sellerEmail: 'test@example.com',
    createdAt: new Date()
  });

  console.log('Inserted room:', result.insertedId);
  client.close();
})();

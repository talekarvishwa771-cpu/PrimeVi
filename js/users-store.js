async function loadUsers(){
  const snap = await db.collection("users").get();
  allUsers = snap.docs.map(d => Object.assign({ uid: d.id }, d.data()));
  return allUsers;
}

async function updateUserFields(uid, fields){
  await db.collection("users").doc(uid).update(fields);
  const u = allUsers.find(x => x.uid === uid);
  if(u) Object.assign(u, fields);
  if(currentUser && currentUser.uid === uid) Object.assign(currentUser, fields);
}

async function deleteUser(uid){
  await db.collection("users").doc(uid).delete();
  allUsers = allUsers.filter(u => u.uid !== uid);
}

async function loadProjects(){
  const isClient = currentUser && currentUser.role === "client";
  let query = db.collection("projects");
  if(isClient) query = query.where("clientUid", "==", currentUser.uid);
  const snap = await query.get();
  projects = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}

function defaultMilestones(type, progress){
  return [
    { name: "Kickoff", done: progress > 0, current: progress === 0 },
    { name: type === "Web Development" ? "Design" : "Rough cut", done: progress >= 40, current: progress > 0 && progress < 40 },
    { name: type === "Web Development" ? "Build" : "Color/Sound", done: progress >= 75, current: progress >= 40 && progress < 75 },
    { name: type === "Web Development" ? "Launch" : "Delivery", done: progress >= 100, current: progress >= 75 && progress < 100 }
  ];
}

async function createProject(data){
  const ref = await db.collection("projects").add(data);
  projects.push(Object.assign({ id: ref.id }, data));
  return ref.id;
}

async function updateProjectFields(id, fields){
  await db.collection("projects").doc(id).update(fields);
  const p = projects.find(pr => pr.id === id);
  if(p) Object.assign(p, fields);
}

async function deleteProjectRemote(id){
  await db.collection("projects").doc(id).delete();
  projects = projects.filter(p => p.id !== id);
}

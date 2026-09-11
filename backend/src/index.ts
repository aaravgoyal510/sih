import { app } from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` KrishiSetu API Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`=================================================`);
});

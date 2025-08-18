export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>✅ Frontend Funcionando!</h1>
      <p>Se você está vendo esta mensagem, o React está funcionando.</p>
      <p>Porta: {window.location.port}</p>
      <p>URL: {window.location.href}</p>
    </div>
  );
}
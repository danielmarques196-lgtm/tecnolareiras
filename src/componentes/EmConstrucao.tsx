export default function EmConstrucao({ titulo, etapa }: { titulo: string; etapa: number }) {
  return (
    <section>
      <h1>{titulo}</h1>
      <div className="cartao vazio">Este módulo chega na etapa {etapa}.</div>
    </section>
  );
}

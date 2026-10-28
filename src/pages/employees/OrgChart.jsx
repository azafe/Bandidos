// Organigrama: árbol de cajas en escritorio; en el celular, lista con
// sangría. Un organigrama de cinco cajas de ancho no entra en 390px y el
// scroll lateral esconde justo la mitad de la jerarquía.
import { useEffect, useState } from "react";
import { colorForName } from "../../utils/colorPalette";
import { areaOf, initials } from "../../lib/team";

const WIDE_QUERY = "(min-width: 1024px)";

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide;
}

export default function OrgChart({ tree, onSelect, onAddBelow }) {
  const wide = useWide();

  if (!wide) {
    return (
      <div className="org-list">
        {tree.map((node) => (
          <ListNode key={node.position.id} node={node} level={0} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div className="org-scroll">
      <div className="org-tree">
        <ul>
          {tree.map((node) => (
            <TreeNode key={node.position.id} node={node} onSelect={onSelect} onAddBelow={onAddBelow} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function TreeNode({ node, onSelect, onAddBelow }) {
  const area = areaOf(node.position.area);
  return (
    <li>
      <div className="org-box-wrap">
        <button
          type="button"
          className="org-box"
          style={{ "--area": area.color }}
          onClick={() => onSelect(node.position.id)}
        >
          <span className="org-box__name">{node.position.name}</span>
          {node.position.description && <span className="org-box__desc">{node.position.description}</span>}
          {node.people.length === 0 ? (
            <span className="org-box__vacant">Vacante</span>
          ) : (
            // Personas en <span>, no en <ul>/<li>: los estilos del árbol les
            // dibujarían líneas.
            <span className="org-box__people">
              {node.people.map((person) => (
                <span key={person.id} className="org-person">
                  <span className="org-avatar" style={{ background: colorForName(person.name) }} aria-hidden="true">
                    {initials(person.name)}
                  </span>
                  <span className="org-person__name">{person.name}</span>
                </span>
              ))}
            </span>
          )}
        </button>
        <button
          type="button"
          className="org-add"
          onClick={() => onAddBelow(node.position.id)}
          aria-label={`Agregar un puesto debajo de ${node.position.name}`}
          title="Agregar un puesto debajo"
        >
          +
        </button>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.position.id} node={child} onSelect={onSelect} onAddBelow={onAddBelow} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ListNode({ node, level, onSelect }) {
  const area = areaOf(node.position.area);
  return (
    <div className={level > 0 ? "org-list__nested" : undefined}>
      <button type="button" className="org-list__item" onClick={() => onSelect(node.position.id)}>
        <span className="org-list__dot" style={{ background: area.color }} aria-hidden="true" />
        <span className="org-list__text">
          <span className="org-list__name" style={{ color: area.color }}>{node.position.name}</span>
          <span className="org-list__people">
            {node.people.length ? node.people.map((p) => p.name).join(", ") : <em>Vacante</em>}
          </span>
        </span>
      </button>
      {node.children.length > 0 && (
        <div className="org-list__children">
          {node.children.map((child) => (
            <ListNode key={child.position.id} node={child} level={level + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

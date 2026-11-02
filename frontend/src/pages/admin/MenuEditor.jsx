import { useState } from "react";
import { api } from "../../api";
import { Loading } from "../../components/ui";
import { rupees } from "../../format";
import { useLive } from "../../useLive";

const loadMenu = () => api("/menu");

const NEW_ITEM = {
  item_name: "",
  category: "",
  price: "",
  base_prep_time_minutes: "",
  stock_quantity: "",
  low_stock_threshold: 5,
  is_available: true,
};

export default function MenuEditor() {
  const { data, refresh } = useLive(loadMenu, 30000);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  if (!data) return <Loading />;

  const categories = [...new Set(data.items.map((item) => item.category))];
  const items = [...data.items]
    .sort((a, b) => a.item_id - b.item_id)
    .filter((item) => item.item_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search items"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search items"
        />
        <button className="button" onClick={() => setEditing(NEW_ITEM)}>
          Add item
        </button>
      </div>

      {editing && (
        <ItemForm
          key={editing.item_id ?? "new"}
          item={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      <ul className="item-table">
        <li className="item-table-head">
          <span>Item</span>
          <span>Price</span>
          <span>Prep</span>
          <span>Stock</span>
          <span />
        </li>
        {items.map((item) => (
          <li key={item.item_id}>
            <span className="item-cell">
              <span>{item.item_name}</span>
              <span className="small muted">
                {item.category}
                {!item.is_available && " · off menu"}
              </span>
            </span>
            <span className="price">{rupees(item.price)}</span>
            <span>{item.base_prep_time_minutes} min</span>
            <span className={`mono ${item.is_low_stock ? "warn-text" : ""}`}>{item.stock_quantity}</span>
            <button className="link" onClick={() => setEditing(item)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ItemForm({ item, categories, onClose, onSaved }) {
  const [form, setForm] = useState(item);
  const [error, setError] = useState("");
  const isNew = !item.item_id;

  const set = (field) => (event) =>
    setForm({ ...form, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value });

  async function submit(event) {
    event.preventDefault();
    const body = {
      item_name: form.item_name,
      category: form.category,
      price: Number(form.price),
      base_prep_time_minutes: Number(form.base_prep_time_minutes),
      stock_quantity: Number(form.stock_quantity),
      low_stock_threshold: Number(form.low_stock_threshold),
      is_available: form.is_available,
    };
    try {
      await api(isNew ? "/admin/items" : `/admin/items/${item.item_id}`, { method: isNew ? "POST" : "PATCH", body });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="panel item-form" onSubmit={submit}>
      <h2>{isNew ? "New item" : `Edit ${item.item_name}`}</h2>
      <div className="form-grid">
        <label>
          Name
          <input value={form.item_name} onChange={set("item_name")} required />
        </label>
        <label>
          Category
          <input list="categories" value={form.category} onChange={set("category")} required />
        </label>
        <label>
          Price (₹)
          <input type="number" min="0" step="0.5" value={form.price} onChange={set("price")} required />
        </label>
        <label>
          Prep time (min)
          <input
            type="number"
            min="1"
            value={form.base_prep_time_minutes}
            onChange={set("base_prep_time_minutes")}
            required
          />
        </label>
        <label>
          Stock
          <input type="number" min="0" value={form.stock_quantity} onChange={set("stock_quantity")} required />
        </label>
        <label>
          Low stock alert at
          <input
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={set("low_stock_threshold")}
            required
          />
        </label>
      </div>
      <datalist id="categories">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <label className="switch">
        <input type="checkbox" checked={form.is_available} onChange={set("is_available")} />
        <span>Show on menu</span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="button">{isNew ? "Add item" : "Save changes"}</button>
      </div>
    </form>
  );
}

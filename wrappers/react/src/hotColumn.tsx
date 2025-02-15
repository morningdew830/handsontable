import React, { ReactPortal } from 'react';
import { HotTableProps, HotColumnProps } from './types';
import {
  createEditorPortal,
  getExtendedEditorElement,
} from './helpers';
import { SettingsMapper } from './settingsMapper';
import { EditorsPortalManager } from './editorsPortalManager';
import Handsontable from 'handsontable/base';

class HotColumn extends React.Component<HotColumnProps, {}> {
  internalProps: string[];
  columnSettings: Handsontable.ColumnSettings;

  /**
   * Component used to manage the editor portals.
   *
   * @type {React.Component}
   */
  private editorsPortalManager: EditorsPortalManager = null;

  /**
   * Set the editors portal manager ref.
   *
   * @param {React.ReactComponent} pmComponent The PortalManager component.
   */
  private setEditorsPortalManagerRef(pmComponent: EditorsPortalManager): void {
    this.editorsPortalManager = pmComponent;
  }

  /**
   * Filter out all the internal properties and return an object with just the Handsontable-related props.
   *
   * @returns {Object}
   */
  getSettingsProps(): HotTableProps {
    this.internalProps = ['_componentRendererColumns', '_emitColumnSettings', '_columnIndex', '_getChildElementByType', '_getRendererWrapper',
      '_getEditorClass', '_getEditorCache', '_getOwnerDocument', 'hot-renderer', 'hot-editor', 'children'];

    return Object.keys(this.props)
      .filter(key => {
        return !this.internalProps.includes(key);
      })
      .reduce((obj, key) => {
        obj[key] = this.props[key];

        return obj;
      }, {});
  }

  /**
   * Get the editor element for the current column.
   *
   * @returns {React.ReactElement} React editor component element.
   */
  getLocalEditorElement(): React.ReactElement | null {
    return getExtendedEditorElement(this.props.children, this.props._getEditorCache(), this.props._columnIndex);
  }

  /**
   * Create the column settings based on the data provided to the `HotColumn` component and it's child components.
   */
  createColumnSettings(): void {
    const rendererElement = this.props._getChildElementByType(this.props.children, 'hot-renderer');
    const editorElement = this.getLocalEditorElement();

    this.columnSettings = SettingsMapper.getSettings(this.getSettingsProps()) as unknown as Handsontable.ColumnSettings;

    if (rendererElement !== null) {
      this.columnSettings.renderer = this.props._getRendererWrapper(rendererElement);
      this.props._componentRendererColumns.set(this.props._columnIndex, true);
    }

    if (editorElement !== null) {
      this.columnSettings.editor = this.props._getEditorClass(editorElement, this.props._columnIndex);
    }
  }

  /**
   * Creates the local editor portal and renders it within the editors portal manager component.
   *
   * @param {Function} callback Callback to call which is triggered after the editors portal is rendered.
   */
  renderLocalEditorPortal(callback: () => void): void {
    const editorCache = this.props._getEditorCache();
    const localEditorElement = getExtendedEditorElement(this.props.children, editorCache, this.props._columnIndex);
    const editorPortal = createEditorPortal(this.props._getOwnerDocument(), localEditorElement);

    this.editorsPortalManager.setState({
      portals: [editorPortal]
    }, callback);
  }

  /**
   * Emit the column settings to the parent using a prop passed from the parent.
   */
  emitColumnSettings(): void {
    this.props._emitColumnSettings(this.columnSettings, this.props._columnIndex);
  }

  /*
  ---------------------------------------
  ------- React lifecycle methods -------
  ---------------------------------------
  */

  /**
   * Logic performed after the mounting of the HotColumn component.
   */
  componentDidMount(): void {
    this.renderLocalEditorPortal(() => {
      this.createColumnSettings();
      this.emitColumnSettings();
    });
  }

  /**
   * Logic performed after the updating of the HotColumn component.
   */
  componentDidUpdate(): void {
    this.renderLocalEditorPortal(() => {
      this.createColumnSettings();
      this.emitColumnSettings();
    });
  }

  /**
   * Render the portals of the editors, if there are any.
   *
   * @returns {React.ReactElement}
   */
  render(): React.ReactElement {
    return (
      <React.Fragment>
        <EditorsPortalManager ref={this.setEditorsPortalManagerRef.bind(this)} />
      </React.Fragment>
    )
  }
}

export { HotColumn };

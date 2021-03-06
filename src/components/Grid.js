import _ from 'lodash';
import React from 'react';

import Settings from '../utils/Settings';
import WidgetEditWrapper from './WidgetEditWrapper';
import GridSquare from './GridSquare';
import { widgets, widgetClasses } from '../constants';

export default class Grid extends React.Component {
  static propTypes = {
    settings: React.PropTypes.object,
  };

  constructor(...args) {
    super(...args);
    this.state = {
      pageHeight: window.innerHeight - 40,
      pageWidth: window.innerWidth,
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  addWidget = (col, row) => {
    const items = this.props.settings.get('gridItems', []);
    items.push({
      widgetID: this.state.toAdd,
      uniqueID: Date.now(),
      x: col,
      y: row,
      width: widgetClasses[this.state.toAdd]().sizes[0][0],
      height: widgetClasses[this.state.toAdd]().sizes[0][1],
    });
    this.props.settings.set('gridItems', items);
    this.setState({
      showGrid: false,
      toAdd: null,
    });
  }

  claim = (item, col, row, dry) => {
    const mItems = this.props.settings.get('gridItems', []).filter((mItem) => mItem.uniqueID !== item.uniqueID);
    let bad = _.range(item.width).some((w) =>
      _.range(item.height).some((h) =>
        this._pointIn(col + w, row + h, mItems)
      )
    );
    let good = false;
    widgetClasses[item.widgetID]().sizes.forEach((d) => {
      if (item.width === d[0] && item.height === d[1]) good = true;
    });
    if (!good) bad = true;
    if (dry) return !bad;
    if (bad) return;
    const items = this.props.settings.get('gridItems', []).map((mItem) => {
      if (mItem.uniqueID !== item.uniqueID) return mItem;
      return Object.assign({}, mItem, {
        x: col,
        y: row,
      });
    });
    this.props.settings.set('gridItems', items);
  }

  handleResize = () => {
    this.setState({
      pageHeight: window.innerHeight - 40,
      pageWidth: window.innerWidth,
    });
  }

  triggerAdd(widgetID) {
    this.setState({
      showGrid: true,
      toAdd: widgetID,
      edit: false,
    });
  }

  toggleEdit() {
    if (this.state.edit) {
      this.setState({
        showGrid: false,
        toAdd: null,
        edit: false,
      });
    } else {
      this.setState({
        showGrid: true,
        toAdd: null,
        edit: true,
      });
    }
  }

  _clash(col, row) {
    if (!this.state.toAdd) return true;
    const width = widgetClasses[this.state.toAdd]().sizes[0][0];
    const height = widgetClasses[this.state.toAdd]().sizes[0][1];
    return _.range(width).some((w) =>
      _.range(height).some((h) =>
        this._pointIn(col + w, row + h, this.props.settings.get('gridItems', []))
      )
    );
  }

  _delete(item) {
    if (!confirm('Are you sure you want to delete this widget?')) return;
    this.props.settings.set('gridItems', this.props.settings.get('gridItems', []).filter((mItem) => mItem.uniqueID !== item.uniqueID));
  }

  _pointIn(col, row, items) {
    return items.some((item) =>
      item.x <= col && item.x + item.width > col
        && item.y <= row && item.y + item.height > row
    );
  }

  _update = (item, newItem) => {
    if (this.claim(newItem, newItem.x, newItem.y, true)) {
      this.props.settings.set('gridItems', this.props.settings.get('gridItems', []).map((mItem) => {
        if (mItem.uniqueID !== newItem.uniqueID) return mItem;
        return newItem;
      }));
    }
  }

  render() {
    const items = this.props.settings.get('gridItems', []);

    const maxXItem = _.maxBy(items, (item) => item.x + item.width) || { x: 0, y: 0, width: 1, height: 1 };
    const maxYItem = _.maxBy(items, (item) => item.y + item.height) || { x: 0, y: 0, width: 1, height: 1 };
    const maxX = maxXItem.x + maxXItem.width + (this.state.showGrid ? 1 : 0);
    const maxY = maxYItem.y + maxYItem.height + (this.state.showGrid ? 1 : 0);

    const maxWidth = Math.max(
      200 + maxX * 160,
      this.state.pageWidth
    );
    const maxHeight = Math.max(
      200 + maxY * 160,
      this.state.pageHeight
    );

    return (
      <div className="app-grid" style={{ width: maxWidth - 10, height: maxHeight - 24 }}>
      {
        items.map((item, key) => {
          if (!widgets[item.widgetID]) return null;
          const Widget = widgetClasses[item.widgetID]();
          const props = {
            width: item.width,
            height: item.height,
          };
          return (
            <div key={`${item.widgetID}_${item.uniqueID}`}>
              <GridSquare key={key} x={item.x} y={item.y} width={item.width} height={item.height} className={`${item.widgetID} ${item.widgetID}_${item.uniqueID}`} inDom>
                <WidgetEditWrapper edit={this.state.edit} item={item} delete={this._delete.bind(this, item)} update={this._update}>
                  <Settings app={Widget} props={props} namespace={`${item.widgetID}_${item.uniqueID}`} />
                </WidgetEditWrapper>
              </GridSquare>
            </div>
          );
        })
      }
      {
        _.range(Math.max(maxX, (this.state.pageWidth - 200) / 160 - 1)).map((col) =>
          _.range(Math.max(maxY, (this.state.pageHeight - 200) / 160 - 1)).map((row) => {
            const pI = this._pointIn(col, row, items);
            const vis = this.state.showGrid && !pI;
            return (
              <GridSquare
                key={`${col}-${row}`} x={col} y={row} width={1} height={1} dark onClick={vis ? this.addWidget.bind(this, col, row) : null}
                edit={this.state.edit} noadd={this._clash(col, row)} visible={this.state.showGrid} inDom={!pI} claim={this.claim}
              />
            );
          })
        )
      }
      </div>
    );
  }
}

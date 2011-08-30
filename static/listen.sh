while true; do
  inotifywait -qq -e CLOSE_WRITE main.coffee
  coffee -c main.coffee
done

NAME=ElasticWolf
VER=$(shell awk '{if($$1=="VERSION:"){gsub(/[\"\",;]+/,"",$$2);print $$2;}}' src/chrome/content/client.js)
OSX=$(NAME).app/Contents

all:

run: dev
	$(OSX)/MacOS/xulrunner -jsconsole

dev:	clean
	ln -sf `pwd`/src/chrome $(OSX)/Resources/chrome 
	ln -sf `pwd`/src/defaults $(OSX)/Resources/defaults 
	ln -sf `pwd`/src/application.ini $(OSX)/Resources/application.ini

build:	clean build_osx build_win
	make dev

version:
	sed -E -i '' -e "s/^Version=.*$$/Version=$(VER)/" src/application.ini
	sed -E -i '' -e "s/\\<em:version\\>([0-9\\.]*)\\<\\/em:version\\>/\\<em:version\\>$(VER)\\<\\/em:version\\>/" src/install.rdf

build_osx: clean_osx version
	rsync -a src/application.ini src/chrome src/defaults $(OSX)/Resources
	zip -rqy ../$(NAME)-osx-$(VER).zip $(NAME).app

build_win: clean_win version
	rsync -a src/application.ini src/chrome src/defaults $(NAME)
	zip -rq ../$(NAME)-win-$(VER).zip $(NAME)

xpi:
	(cd src && zip -rq ../$(NAME)-$(VER).xpi .)

clean: clean_osx clean_win
	rm -rf *.zip

clean_osx:
	rm -rf $(OSX)/Resources/chrome $(OSX)/Resources/application.ini $(OSX)/Resources/defaults

clean_win:
	rm -rf $(NAME)/chrome $(NAME)/defaults $(NAME)/application.ini


